module.exports = async (_req, res) => {
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  res.status(200).json({
    ok: true,
    storage: hasSupabase ? 'supabase' : 'unconfigured'
  });
};
