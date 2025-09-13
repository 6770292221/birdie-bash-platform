export interface ProxyRoute {
  path: string;
  target: string;
  protected: boolean;
  adminRequired?: boolean;
  methods?: string[];
}

export function getRoutes(authUrl: string, eventUrl: string): ProxyRoute[] {
  return [
    { path: "/api/auth", target: authUrl, protected: false },
    {
      path: "/api/events",
      target: eventUrl,
      protected: true,
      adminRequired: true,
      methods: ["POST"],
    },
    {
      path: "/api/events",
      target: eventUrl,
      protected: true,
      adminRequired: false,
    },
  ];
}
