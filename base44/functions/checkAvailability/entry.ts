import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { package_id, start_date, end_date } = await req.json();

    if (!package_id || !start_date || !end_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for blocked dates
    const blocks = await base44.asServiceRole.entities.Availability.filter({
      package_id,
      is_active: true,
    });

    const isBlocked = blocks.some(
      (block) => !(end_date < block.start_date || start_date > block.end_date)
    );

    if (isBlocked) {
      return Response.json({
        available: false,
        reason: 'Dates are blocked for this package',
      });
    }

    // Check for conflicting bookings
    const bookings = await base44.asServiceRole.entities.Booking.filter({
      package_id,
      status: 'confirmed',
    });

    const hasConflict = bookings.some(
      (booking) => !(end_date < booking.start_date || start_date > booking.end_date)
    );

    if (hasConflict) {
      return Response.json({
        available: false,
        reason: 'Dates conflict with existing bookings',
      });
    }

    return Response.json({ available: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});