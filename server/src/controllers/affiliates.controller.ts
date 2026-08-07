import { Request, Response } from 'express';
import { prisma } from '../db';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

export class AffiliatesController {
  static async getAffiliates(req: Request, res: Response) {
    try {
      const { search } = req.query;

      const whereClause: any = {};
      if (search) {
        const query = String(search).trim();
        whereClause.OR = [
          { dni: { contains: query } },
          { matricula: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } }
        ];
      }

      const affiliates = await prisma.affiliate.findMany({
        where: whereClause,
        orderBy: { fullName: 'asc' },
        take: 100
      });

      return res.json({ success: true, data: affiliates });
    } catch (error: any) {
      console.error('[GET AFFILIATES ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al consultar afiliados' });
    }
  }

  static async createAffiliate(req: Request, res: Response) {
    try {
      const { dni, matricula, fullName, phone, email } = req.body;

      if (!dni || !matricula || !fullName) {
        return res.status(400).json({ success: false, error: 'DNI, Matrícula y Nombre Completo son obligatorios' });
      }

      const cleanDni = String(dni).trim().replace(/\D/g, '');
      const cleanMatricula = String(matricula).trim().toUpperCase();

      const existing = await prisma.affiliate.findFirst({
        where: {
          OR: [{ dni: cleanDni }, { matricula: cleanMatricula }]
        }
      });

      if (existing) {
        return res.status(400).json({ success: false, error: 'Ya existe un afiliado con ese DNI o Matrícula' });
      }

      const affiliate = await prisma.affiliate.create({
        data: {
          dni: cleanDni,
          matricula: cleanMatricula,
          fullName: fullName.trim(),
          phone: phone ? String(phone).replace(/\D/g, '') : null,
          email: email ? String(email).trim() : null
        }
      });

      return res.json({ success: true, data: affiliate });
    } catch (error: any) {
      console.error('[CREATE AFFILIATE ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al registrar afiliado' });
    }
  }

  static async importCSV(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se ha adjuntado ningún archivo CSV' });
      }

      const results: any[] = [];
      const stream = Readable.from(req.file.buffer.toString('utf-8'));

      stream
        .pipe(csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          let count = 0;
          let errors = 0;

          for (const row of results) {
            const dni = row.dni || row.documento;
            const matricula = row.matricula || row.matrícula || row.licencia;
            const fullName = row.fullname || row.nombre || row.nombre_completo || row.nombrecompleto;
            const phone = row.phone || row.telefono || row.celular;
            const email = row.email || row.correo;

            if (!dni || !matricula || !fullName) {
              errors++;
              continue;
            }

            const cleanDni = String(dni).trim().replace(/\D/g, '');
            const cleanMatricula = String(matricula).trim().toUpperCase();
            const cleanPhone = phone ? String(phone).trim().replace(/\D/g, '') : null;

            try {
              await prisma.affiliate.upsert({
                where: { dni: cleanDni },
                update: {
                  matricula: cleanMatricula,
                  fullName: String(fullName).trim(),
                  ...(cleanPhone && { phone: cleanPhone }),
                  ...(email && { email: String(email).trim() })
                },
                create: {
                  dni: cleanDni,
                  matricula: cleanMatricula,
                  fullName: String(fullName).trim(),
                  phone: cleanPhone,
                  email: email ? String(email).trim() : null
                }
              });
              count++;
            } catch (err) {
              errors++;
            }
          }

          return res.json({
            success: true,
            message: `Procesamiento completado. ${count} afiliados importados/actualizados. ${errors} omitidos por error de formato.`
          });
        });
    } catch (error: any) {
      console.error('[CSV IMPORT ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al importar padrón CSV' });
    }
  }
}
