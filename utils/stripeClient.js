const Stripe = require("stripe");

let cachedClient = null;

/**
 * Retorna instância singleton do Stripe. Só inicializa após STRIPE_SECRET_KEY estar definida,
 * evitando erro no carregamento do módulo quando o .env ainda não foi lido ou a chave falta.
 */
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || String(key).trim() === "") {
    throw new Error(
      "STRIPE_SECRET_KEY não está definida. Configure no arquivo .env (consulte .env.example)."
    );
  }
  if (!cachedClient) {
    cachedClient = new Stripe(key);
  }
  return cachedClient;
}

module.exports = { getStripe };
