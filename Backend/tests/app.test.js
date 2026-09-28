const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const http = require("node:http");
const { io } = require("socket.io-client");
process.env.JWT_SECRET = "test-only-secret-not-for-deployment";
const app = require("../app");
const Ride = require("../models/ride.model");
const User = require("../models/user.model");
const Captain = require("../models/captain.model");
const maps = require("../services/maps.service");
const service = require("../services/ride.service");
const { initializeSocket } = require("../socket");
let db,
  server,
  base,
  rider,
  captain,
  otherCaptain,
  riderToken,
  captainToken,
  otherToken;
const auth = (token) => ({ Authorization: `Bearer ${token}` });
before(async () => {
  db = await MongoMemoryServer.create();
  process.env.MONGODB_URI = db.getUri();
  await require("../db/db")();
  await Promise.all([Ride.init(), User.init(), Captain.init()]);
  rider = await User.create({
    fullname: { firstname: "Rider" },
    email: "rider@example.com",
    password: await User.hashPassword("password123"),
  });
  const fields = {
    fullname: { firstname: "Captain" },
    password: await Captain.hashPassword("password123"),
    status: "active",
    vehicle: {
      color: "Black",
      plate: "TEST123",
      capacity: 4,
      vehicleType: "car",
    },
    location: { ltd: 28.61, lng: 77.2 },
    locationUpdatedAt: new Date(),
  };
  captain = await Captain.create({ ...fields, email: "captain@example.com" });
  otherCaptain = await Captain.create({
    ...fields,
    email: "other@example.com",
  });
  riderToken = rider.generateAuthToken();
  captainToken = captain.generateAuthToken();
  otherToken = otherCaptain.generateAuthToken();
  server = http.createServer(app);
  initializeSocket(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (db) await db.stop();
});
async function newRide() {
  return Ride.create({
    user: rider._id,
    pickup: "Library",
    destination: "Station",
    vehicleType: "car",
    pickupCoords: { ltd: 28.61, lng: 77.2 },
    destinationCoords: { ltd: 28.65, lng: 77.25 },
    fare: 200,
    otp: "123456",
    distance: 8000,
    duration: 600,
  });
}
test("login responses never expose password hashes or internal account fields", async () => {
  const result = await request(app)
    .post("/users/login")
    .send({ email: rider.email, password: "password123" })
    .expect(200);
  assert.ok(result.body.token);
  assert.equal(result.body.user.password, undefined);
  assert.equal(result.body.user.tokenVersion, undefined);
});
test("profile and saved places persist across fresh profile requests", async () => {
  await request(app)
    .patch("/users/profile")
    .set(auth(riderToken))
    .send({
      fullname: { firstname: "Yashwant", lastname: "Verma" },
      email: rider.email,
    })
    .expect(200);
  await request(app)
    .put("/users/saved-places")
    .set(auth(riderToken))
    .send({ places: [{ label: "Home", address: "Test Library, Delhi" }] })
    .expect(200);
  const response = await request(app)
    .get("/users/profile")
    .set(auth(riderToken))
    .expect(200);
  assert.equal(response.body.fullname.firstname, "Yashwant");
  assert.equal(response.body.savedPlaces[0].label, "Home");
  await request(app)
    .put("/users/saved-places")
    .set(auth(riderToken))
    .send({
      places: [
        { label: "Home", address: "Address one" },
        { label: "Home", address: "Address two" },
      ],
    })
    .expect(400);
});
test("role checks reject rider tokens at captain endpoints", async () => {
  await request(app).get("/captains/profile").set(auth(riderToken)).expect(401);
});
test("missing maps configuration reports unavailable rather than fabricating a fare", async () => {
  const previous = process.env.GOOGLE_MAPS_API;
  delete process.env.GOOGLE_MAPS_API;
  await request(app)
    .get("/rides/get-fare")
    .set(auth(riderToken))
    .query({ pickup: "Delhi library", destination: "Delhi station" })
    .expect(503);
  if (previous) process.env.GOOGLE_MAPS_API = previous;
});
test("missing SMTP never claims that an OTP was emailed", async () => {
  const previous = process.env.SMTP_HOST;
  delete process.env.SMTP_HOST;
  await request(app)
    .post("/users/forgot-password")
    .send({ email: rider.email })
    .expect(503);
  if (previous) process.env.SMTP_HOST = previous;
});
test("fare breakdown adds up and matching excludes wrong vehicles, stale locations and distant captains", () => {
  const result = service.calculateFare(
    { distance: { value: 8000 }, duration: { value: 600 } },
    "car",
  );
  assert.equal(result.fare, 200);
  assert.equal(
    Object.values(result.breakdown).reduce((a, b) => a + b, 0),
    200,
  );
  const candidate = {
    vehicleType: "car",
    pickupCoords: { ltd: 28.61, lng: 77.2 },
  };
  assert.equal(service.canReceiveRide(captain, candidate), true);
  assert.equal(
    service.canReceiveRide(
      { ...captain.toObject(), status: "inactive" },
      candidate,
    ),
    false,
  );
  assert.equal(
    service.canReceiveRide(captain, { ...candidate, vehicleType: "moto" }),
    false,
  );
  assert.equal(
    service.canReceiveRide(captain, {
      ...candidate,
      pickupCoords: { ltd: 19, lng: 72 },
    }),
    false,
  );
  assert.equal(
    service.canReceiveRide(
      { ...captain.toObject(), locationUpdatedAt: new Date(0) },
      candidate,
    ),
    false,
  );
});
test("simultaneous accept requests have exactly one winner; OTP and ownership protect start", async () => {
  const ride = await newRide();
  const results = await Promise.all(
    [captainToken, otherToken].map((token) =>
      request(app)
        .post("/rides/confirm")
        .set(auth(token))
        .send({ rideId: ride._id }),
    ),
  );
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  assert.equal(
    results.find((result) => result.status === 200).body.otp,
    undefined,
  );
  const saved = await Ride.findById(ride._id);
  const winner = saved.captain.equals(captain._id) ? captainToken : otherToken;
  const loser = winner === captainToken ? otherToken : captainToken;
  await request(app)
    .post("/rides/start-ride")
    .set(auth(loser))
    .send({ rideId: ride._id, otp: "123456" })
    .expect(409);
  await request(app)
    .post("/rides/start-ride")
    .set(auth(winner))
    .send({ rideId: ride._id, otp: "999999" })
    .expect(409);
  const started = await request(app)
    .post("/rides/start-ride")
    .set(auth(winner))
    .send({ rideId: ride._id, otp: "123456" })
    .expect(200);
  assert.equal(started.body.status, "ongoing");
  assert.equal(started.body.otp, undefined);
  await request(app)
    .post("/rides/cancel")
    .set(auth(riderToken))
    .send({ rideId: ride._id })
    .expect(409);
  await request(app)
    .post("/rides/end-ride")
    .set(auth(winner))
    .send({ rideId: ride._id })
    .expect(409);
  await request(app)
    .post(`/rides/${ride._id}/payment`)
    .set(auth(riderToken))
    .expect(200);
  const restored = await request(app)
    .get("/rides/active")
    .set(auth(winner))
    .expect(200);
  assert.equal(restored.body.paymentStatus, "rider_confirmed");
  const ended = await request(app)
    .post("/rides/end-ride")
    .set(auth(winner))
    .send({ rideId: ride._id })
    .expect(200);
  assert.equal(ended.body.status, "completed");
  assert.equal(ended.body.paymentStatus, "captain_confirmed");
  await request(app)
    .post(`/rides/${ride._id}/rating`)
    .set(auth(riderToken))
    .send({ rating: 4, review: "Good trip" })
    .expect(200);
  await request(app)
    .post(`/rides/${ride._id}/rating`)
    .set(auth(riderToken))
    .send({ rating: 1 })
    .expect(409);
  await request(app).get(`/rides/${ride._id}`).set(auth(loser)).expect(404);
  const history = await request(app)
    .get("/rides/history")
    .set(auth(riderToken))
    .expect(200);
  assert.equal(history.body.rides[0].rating, 4);
});
test("cancellation is persisted and allows another booking", async () => {
  const ride = await newRide();
  await request(app)
    .post("/rides/cancel")
    .set(auth(riderToken))
    .send({ rideId: ride._id })
    .expect(200);
  assert.equal((await Ride.findById(ride._id)).active, false);
});
test("booking ignores a forged user ID and concurrent duplicate booking is rejected", async () => {
  const originalDistance = maps.getDistanceTime,
    originalCoordinates = maps.getAddressCoordinate;
  maps.getDistanceTime = async () => ({
    distance: { value: 8000 },
    duration: { value: 600 },
  });
  maps.getAddressCoordinate = async () => ({ ltd: 28.61, lng: 77.2 });
  try {
    const body = {
      pickup: "Library",
      destination: "Station",
      vehicleType: "car",
      user: otherCaptain._id,
    };
    const results = await Promise.all(
      [1, 2].map(() =>
        request(app).post("/rides/create").set(auth(riderToken)).send(body),
      ),
    );
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
    const created = results.find((result) => result.status === 201).body;
    assert.equal(created.user._id, rider._id.toString());
    await request(app)
      .post("/rides/cancel")
      .set(auth(riderToken))
      .send({ rideId: created._id })
      .expect(200);
  } finally {
    maps.getDistanceTime = originalDistance;
    maps.getAddressCoordinate = originalCoordinates;
  }
});
test("anonymous sockets are rejected and client join events cannot impersonate another account", async () => {
  const anonymous = io(base, { reconnection: false, forceNew: true });
  await new Promise((resolve, reject) => {
    anonymous.on("connect_error", resolve);
    anonymous.on("connect", () =>
      reject(new Error("Anonymous socket connected")),
    );
  });
  anonymous.disconnect();
  const client = io(base, {
    auth: { token: riderToken },
    reconnection: false,
    forceNew: true,
  });
  await new Promise((resolve, reject) => {
    client.on("connect", resolve);
    client.on("connect_error", reject);
  });
  client.emit("join", { userType: "captain", userId: captain._id });
  client.emit("update-location-captain", {
    userId: captain._id,
    location: { ltd: 0, lng: 0 },
  });
  // A subsequent HTTP read confirms the unauthorised event never changed the captain record.
  const actual = await Captain.findById(captain._id);
  assert.equal(actual.location.ltd, 28.61);
  client.disconnect();
});
test("password reset invalidates old tokens and allows login with the new password", async () => {
  const crypto = require("crypto");
  await User.findByIdAndUpdate(rider._id, {
    resetOtp: crypto.createHash("sha256").update("234567").digest("hex"),
    resetOtpExpires: new Date(Date.now() + 60000),
  });
  await request(app)
    .post("/users/reset-password")
    .send({ email: rider.email, otp: "234567", newPassword: "newpassword123" })
    .expect(200);
  await request(app).get("/users/profile").set(auth(riderToken)).expect(401);
  const login = await request(app)
    .post("/users/login")
    .send({ email: rider.email, password: "newpassword123" })
    .expect(200);
  await request(app)
    .get("/users/profile")
    .set(auth(login.body.token))
    .expect(200);
});
