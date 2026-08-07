import { prisma } from './db';
import { TicketCategory, TicketStatus, TicketPriority, MessageSender, UserRole, AffiliateStatus } from '@prisma/client';

async function main() {
  console.log('[SEED] Iniciando carga de datos iniciales para Colegio de Fonoaudiólogos...');

  // 1. Create Default Admin User
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: 'admin123',
      name: 'Lic. Administrador Fonoaudiología',
      role: UserRole.ADMIN
    }
  });

  const operatorUser = await prisma.user.upsert({
    where: { username: 'operador1' },
    update: {},
    create: {
      username: 'operador1',
      passwordHash: 'admin123',
      name: 'Operador de Atención',
      role: UserRole.OPERADOR
    }
  });

  console.log('[SEED] Usuarios iniciales creados: admin (pass: admin123), operador1 (pass: admin123)');

  // 2. Create Initial Affiliates Roster
  const affiliate1 = await prisma.affiliate.upsert({
    where: { dni: '32456789' },
    update: {},
    create: {
      dni: '32456789',
      matricula: 'M-1042',
      fullName: 'Dra. María Elena Gómez',
      phone: '5491144445555',
      email: 'maria.gomez@fonoaudiologia.org',
      status: AffiliateStatus.ACTIVO
    }
  });

  const affiliate2 = await prisma.affiliate.upsert({
    where: { dni: '28999111' },
    update: {},
    create: {
      dni: '28999111',
      matricula: 'M-0855',
      fullName: 'Lic. Carlos Roberto Spadaro',
      phone: '5491155556666',
      email: 'carlos.spadaro@fonoaudiologia.org',
      status: AffiliateStatus.ACTIVO
    }
  });

  console.log('[SEED] Afiliados iniciales cargados en el padrón.');

  // 3. Create Sample Tickets
  const ticketCount = await prisma.ticket.count();
  if (ticketCount === 0) {
    const t1 = await prisma.ticket.create({
      data: {
        code: 'TICK-100241',
        phone: affiliate1.phone!,
        affiliateId: affiliate1.id,
        category: TicketCategory.CONSULTA,
        status: TicketStatus.NUEVO,
        priority: TicketPriority.ALTA,
        assignedToId: operatorUser.id,
        messages: {
          create: [
            {
              sender: MessageSender.AFILIADO,
              body: 'Buenas tardes. Quisiera consultar sobre los requisitos actualizados para la renovación de mi matrícula profesional para el período 2026.'
            }
          ]
        }
      }
    });

    const t2 = await prisma.ticket.create({
      data: {
        code: 'TICK-100242',
        phone: affiliate2.phone!,
        affiliateId: affiliate2.id,
        category: TicketCategory.CUOTA,
        status: TicketStatus.EN_REVISION,
        priority: TicketPriority.MEDIA,
        assignedToId: operatorUser.id,
        messages: {
          create: [
            {
              sender: MessageSender.AFILIADO,
              body: 'Hola, adjunto comprobante de pago de la cuota social del mes de julio. Favor de confirmar recepción.'
            },
            {
              sender: MessageSender.OPERADOR,
              body: 'Estimado Lic. Spadaro, recibido correctamente. Su estado se encuentra al día.'
            }
          ]
        }
      }
    });

    console.log('[SEED] Tickets de demostración creados.');
  }

  console.log('[SEED] Proceso de seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
