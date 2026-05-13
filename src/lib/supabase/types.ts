/**
 * Re-export of the generated `neuralib` schema types, with the helper
 * generics defaulting to the neuralib schema (the generated `Tables<>`
 * helper otherwise points at `public`, which is empty in this project).
 *
 * Regenerate via `pnpm typegen` after a migration.
 */
import type {
  Database,
  Tables as RawTables,
  TablesInsert as RawTablesInsert,
  TablesUpdate as RawTablesUpdate,
  Enums as RawEnums,
} from "@db/types";

export type { Database, Json } from "@db/types";

export type SchemaName = "neuralib";
type NeuralibTables = Database["neuralib"]["Tables"];
type NeuralibEnums = Database["neuralib"]["Enums"];

export type Tables<TableName extends keyof NeuralibTables> = RawTables<
  { schema: SchemaName },
  TableName
>;

export type TablesInsert<TableName extends keyof NeuralibTables> =
  RawTablesInsert<{ schema: SchemaName }, TableName>;

export type TablesUpdate<TableName extends keyof NeuralibTables> =
  RawTablesUpdate<{ schema: SchemaName }, TableName>;

export type Enums<EnumName extends keyof NeuralibEnums> = RawEnums<
  { schema: SchemaName },
  EnumName
>;
