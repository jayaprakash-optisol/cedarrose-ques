import type { User } from "@/types";
import usersData from "@/mocks/data/users.json";
import { delay } from "./utils";

let usersCache: User[] | null = null;

function getUsers(): User[] {
  if (!usersCache) usersCache = structuredClone(usersData as User[]);
  return usersCache;
}

export interface UsersService {
  list(): Promise<User[]>;
  save(users: User[]): Promise<User[]>;
}

export const mockUsersService: UsersService = {
  async list() {
    await delay();
    return getUsers();
  },
  async save(users) {
    await delay(400);
    usersCache = structuredClone(users);
    return usersCache;
  },
};
