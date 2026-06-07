import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorized - no token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded)
      return res.status(401).json({ success: false, message: "Unauthorized - invalid token" });

    req.userId = decoded.userId;  // ✅ Attach user ID to request
    next(); // ✅ Pass control to the next middleware or controller
  } catch (error) {
    // 🔐 An invalid/expired/tampered token is a client auth problem, not a server error
    if (error.name === "TokenExpiredError")
      return res.status(401).json({ success: false, message: "Unauthorized - session expired" });

    return res.status(401).json({ success: false, message: "Unauthorized - invalid token" });
  }
};
