const mongoose = require("mongoose");
let connection;
module.exports = async function connectToDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");
  if (!connection)
    connection = mongoose
      .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
      .catch((error) => {
        connection = null;
        throw error;
      });
  await connection;
};
