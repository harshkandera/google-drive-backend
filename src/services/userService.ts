import User, { IUser } from "../models/User";
import logger from "../utils/logger";

export interface CreateUserData {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

/**
 * Find or create user from Google OAuth data
 */
export const findOrCreateUser = async (
  userData: CreateUserData
): Promise<IUser> => {
  try {
    // Try to find existing user by googleId
    let user = await User.findOne({ googleId: userData.googleId });

    if (user) {
      // Update user info in case it changed
      user.name = userData.name;
      user.email = userData.email;
      if (userData.avatar) {
        user.avatar = userData.avatar;
      }
      await user.save();

      logger.info(`User logged in: ${user.email}`);
      return user;
    }

    // Create new user
    user = await User.create(userData);
    logger.info(`New user created: ${user.email}`);

    return user;
  } catch (error) {
    logger.error("Error in findOrCreateUser:", error);
    throw error;
  }
};

/**
 * Find user by ID
 */
export const findUserById = async (userId: string): Promise<IUser | null> => {
  return User.findById(userId);
};

/**
 * Find user by email
 */
export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email: email.toLowerCase() });
};

/**
 * Find user by Google ID
 */
export const findUserByGoogleId = async (
  googleId: string
): Promise<IUser | null> => {
  return User.findOne({ googleId });
};

export default {
  findOrCreateUser,
  findUserById,
  findUserByEmail,
  findUserByGoogleId,
};
