export interface User {
  id: number;
  username: string;
  passwordHash: string;
  name: string;
  role?: string;
  cardCode?: string;
  cardName?: string;
  createdAt: Date;
}
