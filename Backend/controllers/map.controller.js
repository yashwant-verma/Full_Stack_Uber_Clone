const service = require("../services/maps.service");
const { asyncHandler } = require("../utils/errors");
exports.getCoordinates = asyncHandler(async (req, res) =>
  res.json(await service.getAddressCoordinate(req.query.address)),
);
exports.getDistanceTime = asyncHandler(async (req, res) =>
  res.json(
    await service.getDistanceTime(req.query.origin, req.query.destination),
  ),
);
exports.getAutoCompleteSuggestions = asyncHandler(async (req, res) =>
  res.json(await service.getAutoCompleteSuggestions(req.query.input)),
);
