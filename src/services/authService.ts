import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import { UserRole } from "../types/user";
import { normalizeEmail } from "../utils/normalizeEmail";
import { hashPassword } from "../utils/passwordUtils";

export async function emailExistsInFirestore(email: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(collection(db, "users"), where("email", "==", normalizeEmail(email)))
  );
  return !snapshot.empty;
}

export async function registerUserInFirestore(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
  position?: string;
  mustChangePassword?: boolean;
  userId?: string;
}): Promise<string> {
  if (await emailExistsInFirestore(data.email)) {
    throw new Error("Este email já está cadastrado");
  }

  const userId = data.userId || `user_${Date.now()}`;
  const passwordHash = await hashPassword(data.password);
  const normalizedEmail = normalizeEmail(data.email);

  const userData: Record<string, unknown> = {
    uid: userId,
    displayName: data.name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: data.role,
    isActive: true,
    createdAt: new Date(),
  };

  if (data.role === UserRole.COMPANY_USER) {
    userData.companyId = data.companyId;
    userData.companyName = data.companyName;
  }

  if (data.position) {
    userData.position = data.position.trim();
  }

  if (data.mustChangePassword) {
    userData.mustChangePassword = true;
  }

  await setDoc(doc(db, "users", userId), userData);
  return userId;
}
