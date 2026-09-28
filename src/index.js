export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/api/hit") return env.ASSETS.fetch(request);
    const cf = request.cf ?? {};
    console.log({
      country: cf.country,
      city: cf.city,
      region: cf.region,
      regionCode: cf.regionCode,
      colo: cf.colo,
      asn: cf.asn,
      asOrganization: cf.asOrganization,
      timezone: cf.timezone,
      referrer: (await request.text()).slice(0, 500) || null,
      userAgent: request.headers.get("user-agent"),
    });
    return new Response(null, { status: 204 });
  },
};
