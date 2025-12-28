// routes/googleReviewRoutes.js
import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { GOOGLE_PLACE_ID, GOOGLE_API_KEY } = process.env;

    if (!GOOGLE_PLACE_ID || !GOOGLE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Google API not configured. Set GOOGLE_PLACE_ID and GOOGLE_API_KEY in .env",
      });
    }

    const url = "https://maps.googleapis.com/maps/api/place/details/json";

    const { data } = await axios.get(url, {
      params: {
        place_id: GOOGLE_PLACE_ID,
        fields:
          "name,rating,user_ratings_total,formatted_address,website,reviews",
        key: GOOGLE_API_KEY,
      },
    });

    if (data.status !== "OK") {
      console.error("Google Places API error:", data);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch reviews from Google",
        status: data.status,
      });
    }

    const result = data.result || {};

    const businessInfo = {
      name: result.name,
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      formatted_address: result.formatted_address,
      website: result.website,
    };

    const reviews = (result.reviews || []).map((r) => ({
      author_name: r.author_name,
      profile_photo_url: r.profile_photo_url,
      rating: r.rating,
      relative_time_description: r.relative_time_description,
      text: r.text,
      time: r.time,
    }));

    res.json({
      success: true,
      businessInfo,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching Google reviews:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching Google reviews",
    });
  }
});

export default router;
