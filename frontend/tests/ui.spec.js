import { test, expect } from "@playwright/test";
import fs from "node:fs";
const screenshotDir = "../docs/screenshots";
test.beforeAll(() => fs.mkdirSync(screenshotDir, { recursive: true }));
test("public pages, mobile layout and demo work without an API", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your next stop/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshotDir}/home-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${screenshotDir}/home-mobile.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/demo");
  for (let step = 0; step < 4; step++)
    await page.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.getByRole("heading", { name: "Trip complete" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start again" }).click();
  for (const path of ["/about", "/help", "/privacy", "/terms", "/not-a-page"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("rider profile persists, booking errors remain visible, and cash state recovers after refresh", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 28.61, longitude: 77.2 });
  await page.addInitScript(() => {
    localStorage.setItem("token", "ui-test-token");
    localStorage.setItem("role", "user");
  });
  let user = {
    _id: "rider",
    fullname: { firstname: "Yashwant", lastname: "Verma" },
    email: "rider@example.com",
    savedPlaces: [],
  };
  let ride = null;
  let failBooking = true;
  await page.route("https://maps.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<p style="font:18px Arial;padding:30px;color:#475569">Map preview · browser test</p>',
    }),
  );
  await page.route("http://localhost:3000/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    let data = null;
    if (path === "/users/profile") {
      if (request.method() === "PATCH")
        user = { ...user, ...request.postDataJSON() };
      data = user;
    } else if (path === "/users/saved-places") {
      user.savedPlaces = request.postDataJSON().places;
      data = user;
    } else if (path === "/rides/active") data = ride;
    else if (path === "/rides/get-fare")
      data = { car: 200, auto: 130, moto: 99 };
    else if (path === "/maps/get-suggestions")
      data = ["City Library, Delhi", "Central Station, Delhi"];
    else if (path === "/rides/create") {
      if (failBooking) {
        failBooking = false;
        return route.fulfill({
          status: 503,
          json: { message: "Maps temporarily unavailable. Please retry." },
        });
      }
      ride = {
        _id: "ride-1",
        ...request.postDataJSON(),
        fare: 200,
        status: "pending",
        otp: "123456",
        paymentStatus: "pending",
      };
      data = ride;
    } else if (path === "/rides/ride-1/payment") {
      ride.paymentStatus = "rider_confirmed";
      data = ride;
    } else if (path === "/rides/cancel")
      return route.fulfill({
        status: 503,
        json: { message: "Cancellation failed. Please retry." },
      });
    return route.fulfill({ json: data });
  });
  await page.goto("/profile");
  await page.getByLabel("First name", { exact: true }).fill("Yashwant Updated");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Yashwant Updated",
  );
  await page.getByLabel("Home", { exact: true }).fill("City Library, Delhi");
  await page.getByRole("button", { name: "Save places" }).click();
  await expect(page.getByText("Saved places updated.")).toBeVisible();
  await page.goto("/home");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Pickup", { exact: true }).fill("City Library, Delhi");
  await page
    .getByLabel("Destination", { exact: true })
    .fill("Central Station, Delhi");
  await page.getByRole("button", { name: "Close suggestions" }).first().click();
  await page.screenshot({
    path: `${screenshotDir}/booking-desktop.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Find a ride", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Maps temporarily unavailable",
  );
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByText("Searching for a captain")).toBeVisible();
  await page.getByRole("button", { name: "Cancel ride" }).click();
  await expect(page.getByText("Searching for a captain")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Cancellation failed");
  ride = {
    ...ride,
    status: "ongoing",
    captain: {
      fullname: { firstname: "Test Captain" },
      vehicle: { plate: "TEST123" },
      location: { ltd: 28.61, lng: 77.2 },
    },
  };
  await page.goto("/riding");
  await page.getByRole("button", { name: "I paid ₹200 in cash" }).click();
  await expect(
    page.getByText(/Waiting for the captain to confirm/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(/Waiting for the captain to confirm/),
  ).toBeVisible();
});
