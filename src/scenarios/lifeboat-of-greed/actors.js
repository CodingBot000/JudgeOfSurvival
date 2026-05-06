import { DEFAULT_CHARACTERS } from "./state.js";

export const actors = DEFAULT_CHARACTERS.map((character) => ({
  id: character.id,
  nameKey: character.name_key,
  roleKey: character.role_key,
}));
