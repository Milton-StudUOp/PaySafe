# PaySafe Terminal POS Android

<div align="center">

![PaySafe](../frontend-next/public/PAYSAFE_SquaredNoBG.png)

**Aplicação Flutter para Terminais POS em Mercados Municipais**

[![Flutter](https://img.shields.io/badge/Flutter-3.10+-02569B?style=flat-square&logo=flutter)](https://flutter.dev)
[![Dart](https://img.shields.io/badge/Dart-3.10+-0175C2?style=flat-square&logo=dart)](https://dart.dev)
[![Android](https://img.shields.io/badge/Android-API%2026+-3DDC84?style=flat-square&logo=android&logoColor=white)](https://developer.android.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE)

</div>

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Estrutura do Projecto](#estrutura-do-projecto)
- [Telas](#telas)
- [Serviços](#serviços)
- [NFC](#nfc)
- [Build e Deploy](#build-e-deploy)
- [Desenvolvimento](#desenvolvimento)

---

## Visão Geral

O **PaySafe Terminal POS** é uma aplicação Flutter desenvolvida para dispositivos Android (H10P/Sunmi) que permite aos agentes de campo realizar cobranças em mercados municipais. A app integra-se com a API backend e suporta:

- ✅ Login seguro com PIN
- ✅ Identificação de comerciantes via NFC
- ✅ Processamento de pagamentos (Cash, M-Pesa, e-Mola)
- ✅ Emissão de recibos digitais
- ✅ Histórico de transações
- ✅ Gestão de comerciantes
- ✅ Feedback háptico e sonoro

---

## Funcionalidades

### Para Agentes

| Funcionalidade | Descrição |
|----------------|-----------|
| **Login Seguro** | Autenticação com código de agente + PIN |
| **Dashboard** | Visão geral de estatísticas diárias |
| **Pagamentos** | Cobrança de taxas com múltiplos métodos |
| **NFC** | Identificação rápida de comerciantes |
| **Recibos** | Geração e visualização de comprovantes |
| **Histórico** | Consulta de transações realizadas |
| **Comerciantes** | Registo e edição de lojistas |

### Melhorias Recentes

- 🔧 **Configuração remota** - URL do servidor configurável
- 📱 **Splash com versão** - Exibição de versão da app
- 📶 **Indicador de conexão** - Status online/offline
- 📳 **Vibração** - Feedback háptico em ações
- 🔊 **Sons** - Confirmação sonora de sucesso/erro

---

## Tecnologias

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **Flutter** | 3.10+ | Framework UI multiplataforma |
| **Dart** | 3.10+ | Linguagem de programação |
| **Android SDK** | API 26+ | Plataforma Android |
| **http** | 1.6+ | Cliente HTTP |
| **shared_preferences** | 2.5+ | Armazenamento local |
| **nfc_manager** | 3.3+ | Leitura de tags NFC |
| **device_info_plus** | 10.1+ | Informações do dispositivo |
| **flutter_animate** | 4.5+ | Animações |
| **google_fonts** | 6.3+ | Tipografia |
| **lucide_icons** | 0.257+ | Iconografia |
| **intl** | 0.19+ | Internacionalização |
| **decimal** | 2.3+ | Precisão monetária |

---

## Arquitetura

```
terminal_pos_android/
├── lib/
│   ├── main.dart                 # Entrada principal
│   ├── screens/                  # Telas da aplicação
│   │   ├── splash_screen.dart
│   │   ├── login_screen.dart
│   │   ├── dashboard_screen.dart
│   │   ├── payment_screen.dart
│   │   ├── merchant_search_screen.dart
│   │   ├── merchant_registration_screen.dart
│   │   ├── edit_merchant_screen.dart
│   │   ├── receipt_screen.dart
│   │   ├── transaction_history_screen.dart
│   │   ├── pin_reset_screen.dart
│   │   └── settings_screen.dart
│   ├── services/                 # Lógica de negócio
│   │   ├── auth_service.dart
│   │   ├── agent_service.dart
│   │   ├── merchant_service.dart
│   │   ├── transaction_service.dart
│   │   ├── market_service.dart
│   │   ├── device_service.dart
│   │   ├── connectivity_service.dart
│   │   ├── feedback_service.dart
│   │   └── inactivity_service.dart
│   └── utils/                    # Utilitários
│       └── constants.dart
├── android/                      # Configuração Android nativa
├── pubspec.yaml                  # Dependências
└── README.md
```

### Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│                      SPLASH SCREEN                          │
│              (Verificação de conexão + versão)              │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      LOGIN SCREEN       │     │    DASHBOARD SCREEN     │
│   (Agent Code + PIN)    │────▶│   (Se já autenticado)   │
└─────────────────────────┘     └─────────────────────────┘
                                            │
              ┌─────────────┬───────────────┼───────────────┐
              ▼             ▼               ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    PAYMENT      │ │  MERCHANT   │ │  HISTORY    │ │  SETTINGS   │
│    SCREEN       │ │   SEARCH    │ │   SCREEN    │ │   SCREEN    │
└─────────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
        │                   │
        ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│    RECEIPT      │ │    REGISTER     │
│    SCREEN       │ │    MERCHANT     │
└─────────────────┘ └─────────────────┘
```

---

## Instalação

### Pré-requisitos

- Flutter SDK 3.10+
- Android Studio ou VS Code
- Dispositivo Android (API 26+) ou Emulador

### Passos

```bash
# 1. Navegar para o directório
cd terminal_pos_android

# 2. Obter dependências
flutter pub get

# 3. Verificar instalação
flutter doctor

# 4. Executar em modo debug
flutter run
```

---

## Configuração

### URL do Servidor

A URL do servidor pode ser configurada de duas formas:

#### 1. Código (Default)

Editar `lib/utils/constants.dart`:

```dart
class AppConstants {
  static const String _defaultBaseUrl = "http://SEU_IP:8000/api/v1";
  // ...
}
```

#### 2. Configurações da App (Runtime)

Aceder a **Configurações** na app e alterar a URL do servidor.

### Variáveis de Configuração

| Variável | Localização | Descrição |
|----------|-------------|-----------|
| `_defaultBaseUrl` | constants.dart | URL padrão da API |
| `appVersion` | constants.dart | Versão da aplicação |
| `appBuildNumber` | constants.dart | Número do build |

---

## Estrutura do Projecto

### Telas (Screens)

| Tela | Ficheiro | Descrição |
|------|----------|-----------|
| **Splash** | `splash_screen.dart` | Inicialização, verificação de conexão |
| **Login** | `login_screen.dart` | Autenticação do agente |
| **Dashboard** | `dashboard_screen.dart` | Painel principal com estatísticas |
| **Payment** | `payment_screen.dart` | Processamento de pagamentos |
| **Merchant Search** | `merchant_search_screen.dart` | Busca de comerciantes |
| **Merchant Register** | `merchant_registration_screen.dart` | Registo de novos comerciantes |
| **Edit Merchant** | `edit_merchant_screen.dart` | Edição de dados do comerciante |
| **Receipt** | `receipt_screen.dart` | Visualização de recibos |
| **History** | `transaction_history_screen.dart` | Histórico de transações |
| **PIN Reset** | `pin_reset_screen.dart` | Alteração de PIN do agente |
| **Settings** | `settings_screen.dart` | Configurações da aplicação |

### Serviços (Services)

| Serviço | Ficheiro | Descrição |
|---------|----------|-----------|
| **AuthService** | `auth_service.dart` | Autenticação, tokens JWT |
| **AgentService** | `agent_service.dart` | Dados do agente logado |
| **MerchantService** | `merchant_service.dart` | CRUD de comerciantes |
| **TransactionService** | `transaction_service.dart` | Criação de transações |
| **MarketService** | `market_service.dart` | Lista de mercados |
| **DeviceService** | `device_service.dart` | Info do dispositivo POS |
| **ConnectivityService** | `connectivity_service.dart` | Monitorização online/offline |
| **FeedbackService** | `feedback_service.dart` | Vibração e sons |
| **InactivityService** | `inactivity_service.dart` | Auto-logout por inactividade |

---

## Telas

### Splash Screen

```dart
// Funcionalidades:
- Inicialização de configurações (AppConstants.initialize())
- Verificação de conexão à internet e servidor
- Exibição de versão da app
- Redirecionamento automático (Login ou Dashboard)
```

### Login Screen

```dart
// Funcionalidades:
- Input de código do agente
- Teclado numérico para PIN
- Validação com API (/auth/pos-login)
- Vinculação dispositivo-agente
- Lembrar último agente
```

### Dashboard Screen

```dart
// Funcionalidades:
- Estatísticas do dia (transações, valor total)
- Acesso rápido a: Pagamento, Comerciantes, Histórico
- Indicador de status online/offline
- Menu de configurações e logout
```

### Payment Screen

```dart
// Funcionalidades:
- Seleção de comerciante (NFC ou busca manual)
- Input de valor com teclado numérico
- Seleção de método: Cash, M-Pesa, e-Mola
- Confirmação de pagamento
- Geração de recibo
- Feedback háptico e sonoro
```

### Settings Screen

```dart
// Funcionalidades:
- URL do servidor (editável)
- Teste de conexão
- Informações da app (versão, build)
- Reset para URL padrão
```

---

## Serviços

### AuthService

```dart
class AuthService {
  // Login POS com validação de dispositivo
  Future<Map<String, dynamic>> posLogin(
    String agentCode, 
    String pin, 
    String deviceSerial
  );
  
  // Obter token armazenado
  Future<String?> getToken();
  
  // Obter dados do utilizador
  Future<Map<String, dynamic>?> getUserData();
  
  // Logout
  Future<void> logout();
  
  // Requisições autenticadas
  Future<http.Response> authenticatedGet(String endpoint);
  Future<http.Response> authenticatedPost(String endpoint, Map body);
}
```

### ConnectivityService

```dart
class ConnectivityService extends ChangeNotifier {
  // Status de conexão
  bool get isOnline;
  bool get isServerReachable;
  bool get isConnected;
  
  // Monitorização
  void startMonitoring({Duration interval});
  void stopMonitoring();
  Future<bool> checkConnectivity();
  
  // Mensagem de status
  String get statusMessage;
}
```

### FeedbackService

```dart
class FeedbackService {
  // Vibração
  Future<void> lightHaptic();
  Future<void> mediumHaptic();
  Future<void> heavyHaptic();
  Future<void> successVibration();   // Padrão duplo
  Future<void> errorVibration();     // Padrão triplo
  
  // Sons
  Future<void> playSuccessSound();
  Future<void> playErrorSound();
  Future<void> playClickSound();
  
  // Combinados
  Future<void> successFeedback();    // Vibra + som
  Future<void> errorFeedback();
  Future<void> buttonTapFeedback();
  Future<void> paymentSuccessFeedback();
}
```

---

## NFC

### Configuração Android

O ficheiro `android/app/src/main/AndroidManifest.xml` deve incluir:

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="true" />
```

### Uso no Código

```dart
import 'package:nfc_manager/nfc_manager.dart';

// Verificar disponibilidade
bool isAvailable = await NfcManager.instance.isAvailable();

// Iniciar leitura
NfcManager.instance.startSession(onDiscovered: (NfcTag tag) async {
  // Processar tag
  String nfcId = extractNfcId(tag);
  // Buscar comerciante pelo NFC ID
  // ...
  NfcManager.instance.stopSession();
});
```

### Fluxo de Identificação NFC

```
┌─────────────────┐
│  Tela Payment   │
│  "Aproxime NFC" │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  NFC Tag Lida   │
│  ID: ABC123     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Request    │
│  GET /merchants │
│  /nfc/ABC123    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Comerciante    │
│  Encontrado     │
│  "João Silva"   │
└─────────────────┘
```

---

## Build e Deploy

### Debug Build

```bash
flutter build apk --debug
# Output: build/app/outputs/flutter-apk/app-debug.apk
```

### Release Build

```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Split APKs (Por Arquitetura)

```bash
flutter build apk --split-per-abi
# Output: 
#   app-armeabi-v7a-release.apk
#   app-arm64-v8a-release.apk
#   app-x86_64-release.apk
```

### App Bundle (Google Play)

```bash
flutter build appbundle
# Output: build/app/outputs/bundle/release/app-release.aab
```

### Instalação no Dispositivo

```bash
# Via ADB
adb install build/app/outputs/flutter-apk/app-release.apk

# Ou directamente via Flutter
flutter install
```

---

## Desenvolvimento

### Executar em Modo Debug

```bash
flutter run
```

### Hot Reload

Pressionar `r` no terminal durante execução.

### Hot Restart

Pressionar `R` no terminal durante execução.

### Logs

```bash
flutter logs
```

### Análise de Código

```bash
flutter analyze
```

### Testes

```bash
flutter test
```

### Adicionar Nova Tela

1. Criar ficheiro em `lib/screens/nova_screen.dart`
2. Implementar `StatefulWidget` ou `StatelessWidget`
3. Adicionar navegação no local apropriado

```dart
Navigator.of(context).push(
  MaterialPageRoute(builder: (_) => const NovaScreen()),
);
```

### Adicionar Novo Serviço

1. Criar ficheiro em `lib/services/novo_service.dart`
2. Implementar padrão Singleton se necessário
3. Importar e usar nas telas

```dart
class NovoService {
  static final NovoService _instance = NovoService._internal();
  factory NovoService() => _instance;
  NovoService._internal();
  
  // Métodos...
}
```

---

## Requisitos do Dispositivo

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| **Android** | API 26 (8.0) | API 30+ (11.0+) |
| **RAM** | 2 GB | 4 GB+ |
| **NFC** | Obrigatório | - |
| **Ecrã** | 4" | 5"+ |

### Dispositivos Testados

- H10P POS Terminal
- Sunmi V2 Pro
- Samsung Galaxy (com NFC)

---

## Troubleshooting

### Erro de Conexão

1. Verificar URL do servidor em **Configurações**
2. Testar conexão com botão "Testar"
3. Verificar se o backend está a correr
4. Verificar firewall/rede

### NFC Não Funciona

1. Verificar se NFC está activado no dispositivo
2. Verificar permissões da app
3. Reiniciar a aplicação

### Logout Automático

A app faz logout após 5 minutos de inactividade (configurável em `InactivityService`).

---

## Licença

Proprietary © 2025 PaySafe Moçambique. Todos os direitos reservados.

---

<div align="center">

**PaySafe Terminal POS**

*Cobranças seguras em mercados municipais*

</div>
