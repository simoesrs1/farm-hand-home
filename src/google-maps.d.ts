/**
 * SDK do Google Maps no `window`, partilhado por todos os mapas da aplicação
 * (MapConsentGate controla quando é carregado).
 *
 * O SDK é carregado por <script> e o projeto não tem os tipos oficiais
 * (@types/google.maps), por isso fica tipado como `any` neste único sítio.
 * Para o tipar a sério: instalar @types/google.maps e trocar por `typeof google`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleMapsSdk = any;

interface Window {
  google: GoogleMapsSdk;
  /** Callbacks de carregamento do SDK, um por mapa. */
  __initDeliveryPicker?: () => void;
  __initDeliveryRouteMap?: () => void;
  __initPickupMap?: () => void;
  __initValorRuralMap?: () => void;
}
