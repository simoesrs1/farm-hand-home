/**
 * SDK do Google Maps no `window`, partilhado por todos os mapas da aplicação
 * (MapConsentGate controla quando é carregado). Tipos de @types/google.maps;
 * `google` só existe depois de o <script> do SDK carregar.
 */
interface Window {
  google?: typeof google;
  /** Callbacks de carregamento do SDK, um por mapa. */
  __initDeliveryPicker?: () => void;
  __initDeliveryRouteMap?: () => void;
  __initPickupMap?: () => void;
  __initValorRuralMap?: () => void;
}
