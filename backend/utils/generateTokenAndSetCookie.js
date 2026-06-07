import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "24h", // 🔐 session is valid for 24 hours
  });

  res.cookie("token", token, {
    httpOnly: true,                          // 🛡️ JS can't read this cookie (protects from XSS)
    secure: process.env.NODE_ENV === "production", // ✅ cookie only sent over HTTPS in prod
    sameSite: "strict",                      // 🧱 blocks CSRF in most cases
    maxAge: 24 * 60 * 60 * 1000,             // ⏳ 24 hours in ms (matches token expiry)
  });

  return token;
};
