import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", // 🔐 token is valid for 7 days
  });

  res.cookie("token", token, {
    httpOnly: true,                          // 🛡️ JS can't read this cookie (protects from XSS)
    secure: process.env.NODE_ENV === "production", // ✅ cookie only sent over HTTPS in prod
    sameSite: "strict",                      // 🧱 blocks CSRF in most cases
    maxAge: 7 * 24 * 60 * 60 * 1000,         // ⏳ 7 days in ms
  });

  return token;
};
