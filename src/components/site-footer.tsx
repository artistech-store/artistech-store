export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="foot-brand">ArtisTech Stores</div>
        <p style={{ marginTop: 4 }}>Build. Collaborate. Publish. - ArtisTech.Store</p>
        <p style={{ marginTop: 12 }}>
          <a href="/about">About</a> &middot; <a href="/help">Help Center</a>{" "}
          &middot; <a href="/privacy">Privacy Policy</a> &middot;{" "}
          <a href="/terms">Terms &amp; Conditions</a> &middot;{" "}
          <a href="/guidelines">Community Guidelines</a>
        </p>
      </div>
    </footer>
  );
}
