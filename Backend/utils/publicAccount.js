module.exports = (account) => {
  const data = account.toObject ? account.toObject() : { ...account };
  for (const key of [
    "tokenVersion",
    "password",
    "resetOtp",
    "resetOtpExpires",
    "socketId",
    "__v",
  ])
    delete data[key];
  return data;
};
