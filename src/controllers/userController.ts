import { Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";
import * as userService from "../services/userService";
import { catchAsync } from "../middlewares/errorHandler";
import config from "../config/env";

/**
 * Get current user profile
 */
export const getProfile = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await userService.findUserById(req.user!.id);

    res.json({
      success: true,
      data: user,
    });
  }
);

/**
 * Sync user from NextAuth (called on sign-in)
 * Generates and returns a backend JWT token
 */
export const syncUser = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { googleId, email, name, avatar } = req.body;

    const user = await userService.findOrCreateUser({
      googleId,
      email,
      name,
      avatar,
    });

    // Generate JWT token for the user
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        googleId: user.googleId,
      },
      config.jwtSecret,
      { expiresIn: "7d" } // Token valid for 7 days
    );

    res.json({
      success: true,
      data: user,
      token, // Return the JWT token
    });
  }
);

export default {
  getProfile,
  syncUser,
};
