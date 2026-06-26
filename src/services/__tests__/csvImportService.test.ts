import { describe, expect, it } from "vitest";
import { parseSpreadsheetFile } from "../csvImportService";

describe("parseSpreadsheetFile", () => {
  it("parses CSV with standard columns", async () => {
    const csv = [
      "cliente,numeroBl,pol,pod,status,booking",
      "Empresa Teste,BL999,Santos,Rotterdam,em-transito,BK001",
    ].join("\n");

    const file = new File([csv], "embarques.csv", { type: "text/csv" });
    const rows = await parseSpreadsheetFile(file);

    expect(rows).toHaveLength(1);
    expect(rows[0].cliente).toBe("Empresa Teste");
    expect(rows[0].numeroBl).toBe("BL999");
    expect(rows[0].pol).toBe("Santos");
    expect(rows[0].pod).toBe("Rotterdam");
    expect(rows[0].status).toBe("em-transito");
    expect(rows[0].booking).toBe("BK001");
  });

  it("normalizes Portuguese status labels", async () => {
    const csv = [
      "cliente,numeroBl,status",
      "Cliente A,BL001,Em Trânsito",
    ].join("\n");

    const file = new File([csv], "test.csv", { type: "text/csv" });
    const rows = await parseSpreadsheetFile(file);

    expect(rows[0].status).toBe("em-transito");
  });

  it("rejects files without valid rows", async () => {
    const csv = "coluna_invalida,valor\nfoo,bar";
    const file = new File([csv], "empty.csv", { type: "text/csv" });

    await expect(parseSpreadsheetFile(file)).rejects.toThrow(
      /Nenhum registro válido/
    );
  });
});
