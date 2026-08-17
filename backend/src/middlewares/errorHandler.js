export default function errorHandler(error, req, res, next) {
  console.error(error);

  res.status(500).json({
    status: "error",
    message: "An unexpected server error occurred."
  });
}