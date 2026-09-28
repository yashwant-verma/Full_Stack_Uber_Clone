module.exports = (account) => {
  const data = account.toObject ? account.toObject() : { ...account };
  for (const key of [
    "tokenVersion",
    "resetOtpAttempts",
    "resetOtpRequestedAt",
    "password",
    "resetOtp",
    "resetOtpExpires",
    "socketId",
    "__v",
  ])
    delete data[key];
  return data;
};
