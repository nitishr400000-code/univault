const VerifyEmailPage = () => (
  <main className="mx-auto grid min-h-[60vh] w-full max-w-lg content-center gap-3 p-6 text-center">
    <h1 className="text-2xl font-semibold">Check your email</h1>
    <p className="text-muted-foreground">
      We sent you a verification link. Verify your email address before signing
      in. If you are running UniVault locally, the link is printed in the web
      server terminal.
    </p>
  </main>
);

export default VerifyEmailPage;
