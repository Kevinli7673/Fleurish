# Fleurish Edge Functions API Contract

This document outlines the API contracts for the Supabase Edge Functions. The base URL for all functions is:
`https://bekvvkgrpygpwqndqkjk.supabase.co/functions/v1`

---

## 1. Identify Plant (`identify-plant`)
Identifies a plant species using an uploaded image.

* **URL**: `/identify-plant`
* **Method**: `POST`
* **Headers**:
  * `Content-Type`: `application/json`
  * `apikey`: `YOUR_SUPABASE_ANON_KEY`
  * `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY` (or user JWT)
* **Request Body**:
  ```json
  {
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJR..." // Base64 encoded image string
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "plant_id": "8bfa27d0-1a6c-4876-8f3b-ea7a0e36504a",
    "common_name": "Monstera Deliciosa",
    "scientific_name": "Monstera deliciosa",
    "confidence": 0.96,
    "care_tips": "Provide bright indirect light. Allow the soil to dry out between waterings. Clean the leaves with a damp cloth.",
    "light_requirement": "Bright indirect light",
    "water_requirement": "Moderate water"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: `{"error": "Missing image parameter (base64 string required)"}`
  * `404 Not Found`: `{"error": "No plants were identified in the image"}`
  * `502 Bad Gateway`: `{"error": "Plant identification service failed", "details": "..."}`

---

## 2. Create Find (`create-find`)
Logs a new plant sighting for the authenticated user.

* **URL**: `/create-find`
* **Method**: `POST`
* **Headers**:
  * `Content-Type`: `application/json`
  * `apikey`: `YOUR_SUPABASE_ANON_KEY`
  * `Authorization`: `Bearer USER_JWT_TOKEN`
* **Request Body**:
  ```json
  {
    "photo_url": "https://bekvvkgrpygpwqndqkjk.supabase.co/storage/v1/object/public/plant-photos/monstera.jpg",
    "lat": 37.7749,
    "lng": -122.4194,
    "plant_id": "8bfa27d0-1a6c-4876-8f3b-ea7a0e36504a", // Optional (null if unidentified)
    "caption": "Spotted this beauty in the park today!", // Optional
    "is_public": true // Optional (defaults to true)
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "find": {
      "id": "e305e718-ef44-46c5-8472-88229cd7bc9e",
      "user_id": "d551053e-a3db-4231-9f94-5951b84908a3",
      "plant_id": "8bfa27d0-1a6c-4876-8f3b-ea7a0e36504a",
      "photo_url": "https://bekvvkgrpygpwqndqkjk.supabase.co/storage/v1/object/public/plant-photos/monstera.jpg",
      "lat": 37.7749,
      "lng": -122.4194,
      "location": "POINT(-122.4194 37.7749)", // PostGIS generated geography
      "city": null,
      "caption": "Spotted this beauty in the park today!",
      "confidence": null,
      "is_public": true,
      "created_at": "2026-07-11T14:40:00.000Z",
      "plants": {
        "id": "8bfa27d0-1a6c-4876-8f3b-ea7a0e36504a",
        "common_name": "Monstera Deliciosa",
        "scientific_name": "Monstera deliciosa",
        "care_tips": "Provide bright indirect light...",
        "light_requirement": "Bright indirect light",
        "water_requirement": "Moderate water"
      },
      "profiles": {
        "id": "d551053e-a3db-4231-9f94-5951b84908a3",
        "username": "Alice",
        "avatar_url": "...",
        "bio": "..."
      }
    }
  }
  ```
* **Side Effects (Database-Triggered)**:
  * Automatically creates a corresponding `'spotted'` event in the `feed_events` table.
  * Automatically increments or resets the user's row in the `streaks` table.

---

## 3. Update Streak (`update-streak`)
Checks and updates the user's streak status, resetting it to `0` if they missed their daily find window.

* **URL**: `/update-streak`
* **Method**: `POST` (or `GET` with Auth header)
* **Headers**:
  * `apikey`: `YOUR_SUPABASE_ANON_KEY`
  * `Authorization`: `Bearer USER_JWT_TOKEN`
* **Request Body**: Empty or `{}`
* **Success Response (200 OK)**:
  ```json
  {
    "user_id": "d551053e-a3db-4231-9f94-5951b84908a3",
    "current_streak": 3,
    "longest_streak": 5,
    "last_find_at": "2026-07-11"
  }
  ```

---

## 4. Get Leaderboard (`get-leaderboard`)
Queries user rankings by plant find count (bloom count).

* **URL**: `/get-leaderboard`
* **Method**: `POST`
* **Headers**:
  * `Content-Type`: `application/json`
  * `apikey`: `YOUR_SUPABASE_ANON_KEY`
  * `Authorization`: `Bearer USER_JWT_TOKEN`
* **Request Body**:
  ```json
  {
    "scope": "week", // "week" | "all_time" (defaults to "all_time")
    "friend_group": ["3fe94230-0067-4111-a4ca-c0fe2f9da471", "01f33119-30bd-4901-bb4d-c2867c120725"] // Optional friend IDs
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "rankings": [
      {
        "user_id": "d551053e-a3db-4231-9f94-5951b84908a3",
        "username": "Alice",
        "avatar_url": "https://...",
        "bloom_count": 12
      },
      {
        "user_id": "3fe94230-0067-4111-a4ca-c0fe2f9da471",
        "username": "Bob",
        "avatar_url": "https://...",
        "bloom_count": 8
      }
    ]
  }
  ```
