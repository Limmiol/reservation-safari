import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all vehicles and equipment
    const vehicles = await base44.asServiceRole.entities.Vehicle.list();
    const equipment = await base44.asServiceRole.entities.Equipment.list();

    const today = new Date();
    const thirtyDaysAhead = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const alerts = {
      vehicles: [],
      equipment: [],
    };

    // Check vehicles for expiring dates
    vehicles.forEach((vehicle) => {
      const issues = [];

      // Check insurance expiry
      if (vehicle.insurance_expiry) {
        const expDate = new Date(vehicle.insurance_expiry);
        if (expDate <= thirtyDaysAhead && expDate >= today) {
          issues.push({
            type: 'Insurance Expiry',
            date: vehicle.insurance_expiry,
            daysLeft: Math.ceil((expDate - today) / (1000 * 60 * 60 * 24)),
          });
        }
      }

      // Check inspection expiry
      if (vehicle.inspection_expiry) {
        const expDate = new Date(vehicle.inspection_expiry);
        if (expDate <= thirtyDaysAhead && expDate >= today) {
          issues.push({
            type: 'Inspection Expiry',
            date: vehicle.inspection_expiry,
            daysLeft: Math.ceil((expDate - today) / (1000 * 60 * 60 * 24)),
          });
        }
      }

      // Check maintenance due
      if (vehicle.next_maintenance_date) {
        const maintenanceDate = new Date(vehicle.next_maintenance_date);
        if (maintenanceDate <= thirtyDaysAhead && maintenanceDate >= today) {
          issues.push({
            type: 'Maintenance Due',
            date: vehicle.next_maintenance_date,
            daysLeft: Math.ceil((maintenanceDate - today) / (1000 * 60 * 60 * 24)),
          });
        }
      }

      if (issues.length > 0) {
        alerts.vehicles.push({
          id: vehicle.id,
          registration: vehicle.registration_number,
          name: vehicle.name,
          issues: issues,
        });
      }
    });

    // Check equipment for service dates
    equipment.forEach((item) => {
      const issues = [];

      // Check next service date
      if (item.next_service_date) {
        const serviceDate = new Date(item.next_service_date);
        if (serviceDate <= thirtyDaysAhead && serviceDate >= today) {
          issues.push({
            type: 'Service Due',
            date: item.next_service_date,
            daysLeft: Math.ceil((serviceDate - today) / (1000 * 60 * 60 * 24)),
          });
        }
      }

      // Check warranty expiry
      if (item.warranty_expiry) {
        const expDate = new Date(item.warranty_expiry);
        if (expDate <= thirtyDaysAhead && expDate >= today) {
          issues.push({
            type: 'Warranty Expiry',
            date: item.warranty_expiry,
            daysLeft: Math.ceil((expDate - today) / (1000 * 60 * 60 * 24)),
          });
        }
      }

      if (issues.length > 0 && item.is_critical) {
        alerts.equipment.push({
          id: item.id,
          name: item.name,
          category: item.category,
          issues: issues,
        });
      }
    });

    // If there are alerts, send email
    if (alerts.vehicles.length > 0 || alerts.equipment.length > 0) {
      const emailBody = generateEmailBody(alerts);

      await base44.integrations.Core.SendEmail({
        to: 'operations@safaricompany.com',
        subject: `[ALERT] Maintenance and Expiry Reminders - ${new Date().toLocaleDateString()}`,
        body: emailBody,
        from_name: 'Safari Operations System',
      });

      return Response.json({
        success: true,
        alerts_sent: true,
        vehicle_alerts: alerts.vehicles.length,
        equipment_alerts: alerts.equipment.length,
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json({
      success: true,
      alerts_sent: false,
      message: 'No expiring items found in the next 30 days',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking maintenance alerts:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});

function generateEmailBody(alerts) {
  let body = 'Daily Maintenance and Expiry Alert Report\n';
  body += '='.repeat(50) + '\n\n';
  body += `Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })}\n\n`;

  if (alerts.vehicles.length > 0) {
    body += 'VEHICLES REQUIRING ATTENTION\n';
    body += '-'.repeat(50) + '\n\n';

    alerts.vehicles.forEach((vehicle) => {
      body += `Vehicle: ${vehicle.registration} (${vehicle.name})\n`;
      vehicle.issues.forEach((issue) => {
        body += `  • ${issue.type}: ${issue.date} (${issue.daysLeft} days remaining)\n`;
      });
      body += '\n';
    });
  }

  if (alerts.equipment.length > 0) {
    body += '\nCRITICAL EQUIPMENT REQUIRING ATTENTION\n';
    body += '-'.repeat(50) + '\n\n';

    alerts.equipment.forEach((item) => {
      body += `Equipment: ${item.name} (${item.category})\n`;
      item.issues.forEach((issue) => {
        body += `  • ${issue.type}: ${issue.date} (${issue.daysLeft} days remaining)\n`;
      });
      body += '\n';
    });
  }

  body += '\nACTION REQUIRED\n';
  body += '-'.repeat(50) + '\n';
  body += 'Please schedule maintenance or renewals as needed.\n';
  body += 'Check the system for more details: [Admin Dashboard]\n';

  return body;
}