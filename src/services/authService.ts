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
import { hashPassword } from "../utils/passwordUtils";

export async function emailExistsInFirestore(email: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(collection(db, "users"), where("email", "==", email.trim()))
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
}): Promise<string> {
  if (await emailExistsInFirestore(data.email)) {
    throw new Error("Este email já está cadastrado");
  }

  const userId = `user_${Date.now()}`;
  const passwordHash = await hashPassword(data.password);

  const userData: Record<string, unknown> = {
    uid: userId,
    displayName: data.name.trim(),
    email: data.email.trim(),
    passwordHash,
    role: data.role,
    isActive: true,
    createdAt: new Date(),
  };

  if (data.role === UserRole.COMPANY_USER) {
    userData.companyId = data.companyId;
    userData.companyName = data.companyName;
  }

  await setDoc(doc(db, "users", userId), userData);
  return userId;
}
