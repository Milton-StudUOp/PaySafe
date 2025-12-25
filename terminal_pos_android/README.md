# Paysafe POS Terminal (Android)

Aplicativo Android (Flutter) para terminais de Ponto de Venda (POS), desenvolvido para hardware Sunmi V2/H10P.

## 📱 Visão Geral

Este aplicativo é a interface do cliente para o sistema Paysafe. Ele gerencia transações, comunicação NFC com cartões, e interação com a API de Backend.

### Principais Funcionalidades

* Processamento de pagamentos.
* Leitura de cartões via NFC (Mifare/NTAG/ISO14443).
* Histórico de transações locais.
* Configurações de terminal.

## 🛠 Pré-requisitos

* **Flutter SDK**: Versão 3.10.3 ou superior.
* **Dart SDK**: Compatível com o Flutter instalado.
* **Android Studio**: Com ferramentas de SDK e emulador (ou dispositivo físico).
* **Java JDK**: Versão 11 ou 17 (dependendo da versão do Gradle).

## ⚙️ Configuração

### 1. Backend URL

O aplicativo precisa saber onde o Backend está rodando.
Edite o arquivo `lib/utils/constants.dart`:

```dart
class AppConstants {
  // Ajuste para o IP da sua máquina ou servidor
  // Para emulador Android padrão use: http://10.0.2.2:8000/api/v1
  // Para dispositivo físico na mesma rede: http://SEU_IP_LOCAL:8000/api/v1
  static const String _defaultBaseUrl = "http://10.51.164.109:8000/api/v1"; 

  static String get baseUrl => _defaultBaseUrl;
}
```

### 2. Instalar Dependências

No terminal, dentro da pasta `terminal_pos_android`:

```bash
flutter pub get
```

## 🚀 Como Rodar

### Emulador

Selecione um emulador no seu IDE (VS Code ou Android Studio) e execute:

```bash
flutter run
```

### Dispositivo Físico (POS Sunmi/Android)

1. Habilite a **Depuração USB** no dispositivo.
2. Conecte via cabo USB.
3. Execute:

```bash
flutter run
```

## 📦 Build para Produção (APK)

Para gerar o arquivo `.apk` para instalação manual:

```bash
flutter build apk --release
```

O arquivo será gerado em: `build/app/outputs/flutter-apk/app-release.apk`

## 🧩 Estrutura do Projeto

* `lib/screens`: Telas da aplicação (Login, Home, Pagamento).
* `lib/providers`: Gerenciamento de estado.
* `lib/services`: Comunicação com APIs e Hardware.
* `lib/utils`: Constantes e funções utilitárias.
