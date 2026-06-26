interface ConfigMissingProps {
  missing: string[];
}

export function ConfigMissing({ missing }: ConfigMissingProps) {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 560,
        margin: "4rem auto",
        padding: "2rem",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ color: "#118ab2", marginTop: 0 }}>Sea Logistics</h1>
      <p>
        O app não pode iniciar porque faltam variáveis no arquivo{" "}
        <code>.env</code> na raiz do projeto:
      </p>
      <ul>
        {missing.map((key) => (
          <li key={key}>
            <code>{key}</code>
          </li>
        ))}
      </ul>
      <p>
        Copie os valores do <strong>Firebase Console</strong> (Project Settings →
        Your apps → Web) ou do painel <strong>Netlify</strong> (Site settings →
        Environment variables).
      </p>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        Depois de salvar o <code>.env</code>, reinicie com{" "}
        <code>npm run dev</code> e acesse{" "}
        <a href="http://localhost:5173">http://localhost:5173</a>.
      </p>
    </div>
  );
}
