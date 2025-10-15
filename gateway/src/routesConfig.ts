export interface ProxyRoute {
  path: string;
  target: string;
  protected: boolean;
  adminRequired?: boolean;
  adminForMethods?: string[];
  methods?: string[];
}

export function getRoutes(
  authUrl: string,
  eventUrl: string,
  settlementUrl: string,
  registrationUrl?: string,
  matchingUrl?: string
): ProxyRoute[] {
  return [
    // Registration service routes first (more specific)
    ...(registrationUrl
      ? [
          // New namespaced paths
          { path: "/api/registration/events/:id/members", target: registrationUrl, protected: true },
          { path: "/api/registration/events/:id/member", target: registrationUrl, protected: true },
          { path: "/api/registration/events/:id/guests", target: registrationUrl, protected: true, adminRequired: true },
          { path: "/api/registration/events/:id/players", target: registrationUrl, protected: true },
          { path: "/api/registration/events/:id/players/:pid/cancel", target: registrationUrl, protected: true },
          { path: "/api/registration/users/registrations", target: registrationUrl, protected: true },
          // Legacy compatibility (optional; remove if you want to hard cutover)
          { path: "/api/events/:id/members", target: registrationUrl, protected: true },
          { path: "/api/events/:id/member", target: registrationUrl, protected: true },
          { path: "/api/events/:id/guests", target: registrationUrl, protected: true, adminRequired: true },
          { path: "/api/events/:id/players", target: registrationUrl, protected: true },
          { path: "/api/events/:id/players/:pid/cancel", target: registrationUrl, protected: true },
        ]
      : []),
    {
      path: "/api/auth/profile",
      target: authUrl,
      protected: true,
      methods: ["GET"],
    },
    {
      path: "/api/auth/users",
      target: authUrl,
      protected: true,
      adminRequired: true,
      methods: ["GET"],
    },
    {
      path: "/api/auth/user/:id",
      target: authUrl,
      protected: true,
      methods: ["GET"],
    },
    { path: "/api/auth", target: authUrl, protected: false },
    {
      path: "/api/events",
      target: eventUrl,
      protected: true,
      adminRequired: false,
      adminForMethods: ["POST", "PUT", "PATCH", "DELETE"],
    },
    {
      path: "/api/event/venues",
      target: eventUrl,
      protected: true,
      adminRequired: false,
      methods: ["GET"],
    },
    {
      path: "/api/event/venues/:id",
      target: eventUrl,
      protected: true,
      adminRequired: false,
      methods: ["GET"],
    },
    {
      path: "/api/settlements",
      target: settlementUrl,
      protected: true,
      adminRequired: true,
    },
    {
      path: "/api/matchings",
      target: matchingUrl || "",
      protected: true,
      adminRequired: true,
    }
  ];
}
