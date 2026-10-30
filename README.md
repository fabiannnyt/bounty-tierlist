# Bounty SMP Tierlist

Tierlist-site voor de spelers van de Bounty SMP. Iedere speler logt in met zijn Twitch-naam (of Minecraft-naam als hij geen Twitch heeft) en rankt alle 40 spelers van S tot F. Lijsten worden automatisch opgeslagen in Supabase en zijn door de anderen te bekijken.

- `index.html` – opmaak en stijl
- `app.js` – login, slepen, opslaan
- `players.js` – spelerslijst (Twitch-kanaal + MC-naam)
- `img/` – profielfoto's

Een speler toevoegen: zet hem in `players.js`, voeg `img/<login>.webp` toe en voeg hem toe aan de tabel `tier_players` in Supabase.
