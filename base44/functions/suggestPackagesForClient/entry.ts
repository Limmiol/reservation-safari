import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id } = await req.json();

    // Fetch client details
    const client = await base44.asServiceRole.entities.Client.read(client_id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get client's previous bookings
    const bookings = await base44.asServiceRole.entities.Booking.filter({
      client_id: client_id
    });

    // Get client's feedback/ratings
    const feedback = await base44.asServiceRole.entities.Feedback.filter({
      client_id: client_id
    });

    // Extract preferred destinations and packages from history
    const preferredDestinations = new Set();
    const preferredCategories = new Set();

    bookings.forEach(booking => {
      if (booking.package_name) preferredDestinations.add(booking.package_name);
    });

    feedback.forEach(fb => {
      if (fb.rating >= 4) preferredCategories.add('premium');
      else if (fb.rating >= 3) preferredCategories.add('mid_range');
    });

    // Get all packages
    const allPackages = await base44.asServiceRole.entities.Package.list();

    // Score and recommend packages
    const recommendations = allPackages
      .filter(p => p.status === 'active')
      .map(pkg => {
        let score = 0;
        
        // Higher score if client has done this package before
        if (preferredDestinations.has(pkg.name)) score += 30;
        
        // Match category preference
        if (preferredCategories.has(pkg.category)) score += 20;
        
        // Boost popular/luxury for returning clients with good feedback
        if (feedback.some(f => f.would_recommend && f.rating >= 4)) {
          if (pkg.category === 'luxury' || pkg.category === 'premium') score += 15;
        }
        
        return { ...pkg, recommendation_score: score };
      })
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, 5);

    return Response.json({
      client_name: client.full_name,
      previous_bookings: bookings.length,
      average_rating: feedback.length > 0 
        ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
        : 'N/A',
      recommendations: recommendations.map(r => ({
        id: r.id,
        name: r.name,
        destination: r.destination,
        duration: r.duration_days,
        price: r.price_per_person,
        category: r.category,
        score: r.recommendation_score
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});