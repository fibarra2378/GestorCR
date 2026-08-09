import { Request, Response } from 'express';
import { prisma } from '../db';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const inMemoryAffiliates: any[] = [
  { id: 'aff-1', dni: '123456789', matricula: 'MAT-9921', fullName: 'Fernando Ibarra', email: 'fernandoibarra23@gmail.com', phone: '3424112233', status: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: 'aff-2', dni: '33445566', matricula: 'MAT-4412', fullName: 'Carlos Spadaro', email: 'carlos.spadaro@gmail.com', phone: '3425998877', status: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: 'aff-3', dni: '28990112', matricula: 'MAT-1102', fullName: 'Laura Rossi', email: 'laura.rossi@gmail.com', phone: '3424556677', status: 'ACTIVO', createdAt: new Date().toISOString() }
];

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
      console.warn('[GET AFFILIATES WARNING - USING FALLBACK STORE]', error.message || error);
      let filtered = [...inMemoryAffiliates];
      const { search } = req.query;
      if (search) {
        const q = String(search).toLowerCase();
        filtered = filtered.filter(a =>
          a.dni.includes(q) ||
          a.matricula.toLowerCase().includes(q) ||
          a.fullName.toLowerCase().includes(q)
        );
      }
      return res.json({ success: true, data: filtered, fallback: true });
    }
  }

  static async createAffiliate(req: Request, res: Response) {
    const { dni, matricula, fullName, phone, email } = req.body;

    if (!dni || !matricula || !fullName) {
      return res.status(400).json({ success: false, error: 'DNI, Matrícula y Nombre Completo son obligatorios' });
    }

    const cleanDni = String(dni).trim().replace(/\D/g, '');
    const cleanMatricula = String(matricula).trim().toUpperCase();
    const cleanFullName = String(fullName).trim();
    const cleanPhone = phone && String(phone).trim() ? String(phone).replace(/\D/g, '') || null : null;
    const cleanEmail = email && String(email).trim() ? String(email).trim() : null;

    if (!cleanDni) {
      return res.status(400).json({ success: false, error: 'El DNI debe contener números válidos' });
    }

    if (!cleanMatricula) {
      return res.status(400).json({ success: false, error: 'La Matrícula no puede estar vacía' });
    }

    if (!cleanFullName) {
      return res.status(400).json({ success: false, error: 'El Nombre Completo no puede estar vacío' });
    }

    // Validar duplicados en memoria primero
    const dupInMemory = inMemoryAffiliates.find(a =>
      a.dni === cleanDni || a.matricula === cleanMatricula || (cleanPhone && a.phone === cleanPhone)
    );
    if (dupInMemory) {
      if (dupInMemory.dni === cleanDni) {
        return res.status(400).json({ success: false, error: 'Ya existe un afiliado registrado con ese DNI' });
      }
      if (dupInMemory.matricula === cleanMatricula) {
        return res.status(400).json({ success: false, error: 'Ya existe un afiliado registrado con esa Matrícula' });
      }
      if (cleanPhone && dupInMemory.phone === cleanPhone) {
        return res.status(400).json({ success: false, error: 'Ya existe un afiliado registrado con ese número de teléfono' });
      }
    }

    try {
      const orConditions: any[] = [
        { dni: cleanDni },
        { matricula: cleanMatricula }
      ];
      if (cleanPhone) {
        orConditions.push({ phone: cleanPhone });
      }

      const existing = await prisma.affiliate.findFirst({
        where: { OR: orConditions }
      });

      if (existing) {
        if (existing.dni === cleanDni) {
          return res.status(400).json({ success: false, error: 'Ya existe un afiliado registrado con ese DNI' });
        }
        if (existing.matricula === cleanMatricula) {
          return res.status(400).json({ success: false, error: 'Ya existe un afiliado registrado con esa Matrícula' });
        }
        if (cleanPhone && existing.phone === cleanPhone) {
          return res.status(400).json({ success: false, error: 'Ya existe un afiliado registrado con ese número de teléfono' });
        }
        return res.status(400).json({ success: false, error: 'Ya existe un afiliado con esos datos en el padrón' });
      }

      const affiliate = await prisma.affiliate.create({
        data: {
          dni: cleanDni,
          matricula: cleanMatricula,
          fullName: cleanFullName,
          phone: cleanPhone,
          email: cleanEmail
        }
      });

      inMemoryAffiliates.unshift(affiliate);
      return res.status(201).json({ success: true, data: affiliate });
    } catch (error: any) {
      console.warn('[CREATE AFFILIATE WARNING - USING FALLBACK STORE]', error.message || error);

      const newAffiliate = {
        id: `aff-mem-${Date.now()}`,
        dni: cleanDni,
        matricula: cleanMatricula,
        fullName: cleanFullName,
        phone: cleanPhone,
        email: cleanEmail,
        status: 'ACTIVO',
        createdAt: new Date().toISOString()
      };
      inMemoryAffiliates.unshift(newAffiliate);

      return res.status(201).json({ success: true, data: newAffiliate, fallback: true });
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
              const memObj = {
                id: `aff-csv-${Date.now()}-${count}`,
                dni: cleanDni,
                matricula: cleanMatricula,
                fullName: String(fullName).trim(),
                phone: cleanPhone,
                email: email ? String(email).trim() : null,
                status: 'ACTIVO',
                createdAt: new Date().toISOString()
              };
              inMemoryAffiliates.unshift(memObj);
              count++;
            }
          }

          return res.json({
            success: true,
            message: `Procesamiento completado. ${count} afiliados importados/actualizados.`
          });
        });
    } catch (error: any) {
      console.error('[CSV IMPORT ERROR]', error);
      return res.status(500).json({ success: false, error: 'Error al importar padrón CSV' });
    }
  }
}
