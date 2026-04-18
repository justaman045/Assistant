import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile } from "./types";

type UpdatableFields = Partial<Pick<UserProfile, "preferredName" | "role" | "defaultModel">>;

export async function updateUserProfile(uid: string, fields: UpdatableFields): Promise<void> {
  await updateDoc(doc(db, "users", uid), fields);
}
