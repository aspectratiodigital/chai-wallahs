// Build-time Spotify lookups (Client Credentials flow — no user login
// involved, just server-to-server access to Spotify's public catalog).
// Requires SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET as build environment
// variables (set locally in .env, and in Netlify's site environment
// variables for deploys). Never exposed to the browser: everything here
// only ever runs from Astro frontmatter (getStaticPaths), at build time.
//
// Free to set up: create an app at https://developer.spotify.com/dashboard
// (no approval/review needed for this — Client Credentials access to
// public catalog data is unrestricted) and copy its Client ID/Secret.

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = import.meta.env.SPOTIFY_CLIENT_ID;
  const clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in: number };
    // Refresh a minute early so we never hand out a token that expires
    // mid-build.
    cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return cachedToken.token;
  } catch {
    return null;
  }
}

export interface SpotifyTrack {
  id: string;
  name: string;
}

// The artist's single most popular track right now, per Spotify's own
// popularity score - re-fetched on every build, so it tracks new
// releases automatically without anyone having to update a track link
// by hand. Returns null (never throws) on any failure - a missing
// artist ID, an invalid one, no tracks, or Spotify being unreachable -
// so one bad lookup can't break the build for every other artist.
export async function getMostPopularTrack(spotifyArtistId: string): Promise<SpotifyTrack | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/artists/${spotifyArtistId}/top-tracks?market=GB`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tracks?: Array<{ id: string; name: string; popularity: number }> };
    const tracks = data.tracks ?? [];
    if (tracks.length === 0) return null;

    const top = tracks.reduce((best, t) => (t.popularity > best.popularity ? t : best), tracks[0]);
    return { id: top.id, name: top.name };
  } catch {
    return null;
  }
}
