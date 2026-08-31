import "server-only"

import { findUserById, setUserAvatar } from "@/infra/db/repositories/users.repository"
import { deleteCloudinaryAsset } from "@/infra/storage/cloudinary.client"

/** Deletes the previous Cloudinary asset (if any) before writing the new
 * one, so replacing an avatar doesn't leave an orphaned upload behind. */
export async function replaceAvatar(userId: string, next: { url: string; publicId: string }) {
  const user = await findUserById(userId)
  if (user?.avatarPublicId) {
    await deleteCloudinaryAsset(user.avatarPublicId)
  }
  return setUserAvatar(userId, next)
}

export async function removeAvatar(userId: string) {
  const user = await findUserById(userId)
  if (user?.avatarPublicId) {
    await deleteCloudinaryAsset(user.avatarPublicId)
  }
  return setUserAvatar(userId, null)
}
