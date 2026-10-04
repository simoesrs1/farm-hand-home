/** Logótipo "G" da Google nas cores oficiais. Decorativo: o texto está no botão. */
const GoogleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    <path
      fill="#4285F4"
      d="M23.06 12.26c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2.01 3.44-4.97 3.44-8.56Z"
    />
    <path
      fill="#34A853"
      d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.7v2.98A11.5 11.5 0 0 0 12 23.5Z"
    />
    <path
      fill="#FBBC05"
      d="M5.55 14.18a6.9 6.9 0 0 1 0-4.36V6.84H1.7a11.5 11.5 0 0 0 0 10.32l3.85-2.98Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.08c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.63 15.1.5 12 .5A11.5 11.5 0 0 0 1.7 6.84l3.85 2.98C6.46 7.1 9 5.08 12 5.08Z"
    />
  </svg>
);

export default GoogleIcon;
