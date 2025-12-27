import File, { IFile } from "../models/File";
import * as storageService from "./storageService";
import { AppError } from "../middlewares/errorHandler";
import logger from "../utils/logger";
import path from "path";

export interface CreateFileData {
  userId: string;
  filename: string;
  originalName: string;
  buffer: Buffer;
  size: number;
  mimeType: string;
}

/**
 * Generate unique filename if name already exists
 */
const generateUniqueFilename = async (
  userId: string,
  desiredFilename: string
): Promise<string> => {
  const existing = await File.findOne({
    owner: userId,
    filename: desiredFilename,
  });

  if (!existing) {
    return desiredFilename;
  }

  // Add number suffix
  const ext = path.extname(desiredFilename);
  const base = path.basename(desiredFilename, ext);
  let counter = 1;
  let newFilename: string;

  do {
    newFilename = `${base} (${counter})${ext}`;
    const exists = await File.findOne({
      owner: userId,
      filename: newFilename,
    });
    if (!exists) break;
    counter++;
  } while (counter < 1000); // Safety limit

  return newFilename;
};




/**
 * Upload and create file record
 */
export const uploadFile = async (data: CreateFileData): Promise<IFile> => {
  const { userId, filename, originalName, buffer, size, mimeType } = data;

  // Validate file
  storageService.validateFileSize(size);
  storageService.validateFileType(mimeType);

  // Generate unique filename
  const uniqueFilename = await generateUniqueFilename(userId, filename);

  // Upload to storage
  const uploadResult = await storageService.uploadFile(
    userId,
    uniqueFilename,
    buffer,
    mimeType
  );

  // Create database record
  const file = await File.create({
    owner: userId,
    filename: uniqueFilename,
    originalName,
    size,
    mimeType,
    storageType: uploadResult.storageType,
    path: uploadResult.path,
    s3Key: uploadResult.s3Key,
  });

  logger.info(`File created: ${file.filename} for user ${userId}`);

  return file;
};

/**
 * Get all files for a user
 */
export const getUserFiles = async (userId: string): Promise<IFile[]> => {
  return File.find({ owner: userId })
    .sort({ createdAt: -1 })
    .populate("sharedWith", "name email avatar");
};



/**
 * Get files shared with user
 */
export const getSharedFiles = async (userId: string): Promise<IFile[]> => {
  return File.find({ sharedWith: userId })
    .sort({ createdAt: -1 })
    .populate("owner", "name email avatar");
};


/**
 * Get file by ID
 */
export const getFileById = async (
  fileId: string,
  userId: string
): Promise<IFile> => {
  const file = await File.findById(fileId).populate(
    "owner sharedWith",
    "name email avatar"
  );

  if (!file) {
    throw new AppError("File not found", 404);
  }

  // Check if user has access (owner or shared with)
  const isOwner = file.owner._id.toString() === userId;
  const isShared = file.sharedWith.some(
    (user: any) => user._id.toString() === userId
  );

  if (!isOwner && !isShared) {
    throw new AppError("Access denied", 403);
  }

  return file;
};

/**
 * Delete file
 */
export const deleteFile = async (
  fileId: string,
  userId: string
): Promise<void> => {
  const file = await File.findById(fileId);

  if (!file) {
    throw new AppError("File not found", 404);
  }

  // Only owner can delete
  if (file.owner.toString() !== userId) {
    throw new AppError("Only the owner can delete this file", 403);
  }

  // Delete from storage
  const pathOrKey = file.storageType === "s3" ? file.s3Key! : file.path!;
  await storageService.deleteFile(file.storageType, pathOrKey);

  // Delete from database
  await File.findByIdAndDelete(fileId);

  logger.info(`File deleted: ${file.filename} by user ${userId}`);
};

/**
 * Rename file
 */
export const renameFile = async (
  fileId: string,
  userId: string,
  newFilename: string
): Promise<IFile> => {
  const file = await File.findById(fileId);

  if (!file) {
    throw new AppError("File not found", 404);
  }

  // Only owner can rename
  if (file.owner.toString() !== userId) {
    throw new AppError("Only the owner can rename this file", 403);
  }

  // Check if new filename is already taken by this user
  const existing = await File.findOne({
    owner: userId,
    filename: newFilename,
    _id: { $ne: fileId },
  });

  if (existing) {
    throw new AppError("A file with this name already exists", 409);
  }

  file.filename = newFilename;
  await file.save();

  logger.info(`File renamed to: ${newFilename} by user ${userId}`);

  return file;
};

/**
 * Search files by name
 */
export const searchFiles = async (
  userId: string,
  query: string
): Promise<IFile[]> => {
  const regex = new RegExp(query, "i"); // Case-insensitive search

  return File.find({
    owner: userId,
    filename: regex,
  })
    .sort({ createdAt: -1 })
    .limit(50); // Limit results
};

/**
 * Get download URL for file
 */
export const getFileDownloadUrl = async (
  fileId: string,
  userId: string
): Promise<string> => {
  const file = await getFileById(fileId, userId);

  const pathOrKey = file.storageType === "s3" ? file.s3Key! : file.path!;
  return storageService.getDownloadUrl(
    file.storageType,
    pathOrKey,
    file.filename
  );
};

export default {
  uploadFile,
  getUserFiles,
  getSharedFiles,
  getFileById,
  deleteFile,
  renameFile,
  searchFiles,
  getFileDownloadUrl,
};
