import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import { User, UserRole } from "../types/user";
import { registerUserInFirestore } from "./authService";
import { provisionFirebaseUser } from "./authApi";
import { createAuthUserViaSecondaryApp } from "./firebaseAuthClient";

export interface CompanyEmployee {
  uid: string;
  displayName: string;
  email: string;
  position?: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt?: Date;
  lastLogin?: Date;
}

export async function listCompanyEmployees(
  companyId: string
): Promise<CompanyEmployee[]> {
  const snapshot = await getDocs(
    query(
      collection(db, "users"),
      where("companyId", "==", companyId),
      where("role", "==", UserRole.COMPANY_USER)
    )
  );

  return snapshot.docs
    .map((docSnap) => {
    const data = docSnap.data();
    return {
      uid: docSnap.id,
      displayName: data.displayName || data.name || "—",
      email: data.email || "—",
      position: data.position,
      isActive: data.isActive !== false,
      mustChangePassword: Boolean(data.mustChangePassword),
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
      lastLogin: data.lastLogin?.toDate?.() ?? data.lastLogin,
    };
  });
}

export async function createCompanyEmployee(input: {
  name: string;
  email: string;
  password: string;
  position?: string;
  companyId: string;
  companyName: string;
}): Promise<string> {
  let userId: string | undefined;

  try {
    userId = await createAuthUserViaSecondaryApp(input.email, input.password);
  } catch (error) {
    console.warn(
      "[Equipe] Criação direta no Firebase Auth falhou, usando ID legado:",
      error
    );
  }

  const resolvedUserId = await registerUserInFirestore({
    name: input.name,
    email: input.email,
    password: input.password,
    role: UserRole.COMPANY_USER,
    companyId: input.companyId,
    companyName: input.companyName,
    position: input.position,
    mustChangePassword: true,
    userId,
  });

  if (!userId) {
    try {
      await provisionFirebaseUser({
        uid: resolvedUserId,
        email: input.email,
        password: input.password,
        displayName: input.name,
      });
    } catch (error) {
      console.warn("[Equipe] Firebase Auth não provisionado (backend offline?):", error);
    }
  }

  return resolvedUserId;
}