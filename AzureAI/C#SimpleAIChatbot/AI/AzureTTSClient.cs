using System.ClientModel;

namespace SimpleAzureOpenAIChatbot.AI
{
    // ─────────────────────────────────────────────────────────────────────────
    // Options & Result models
    // ─────────────────────────────────────────────────────────────────────────

    public static class TTSVoice
    {
        public const string Alloy   = "alloy";
        public const string Echo    = "echo";
        public const string Fable   = "fable";
        public const string Onyx    = "onyx";
        public const string Nova    = "nova";
        public const string Shimmer = "shimmer";
    }

    public static class TTSFormat
    {
        public const string Mp3  = "mp3";
        public const string Opus = "opus";
        public const string Aac  = "aac";
        public const string Flac = "flac";
        public const string Wav  = "wav";
        public const string Pcm  = "pcm";
    }

    public class SpeechGenerationOptions
    {
        /// <summary>Voice to use. See <see cref="TTSVoice"/>. Default: alloy.</summary>
        public string Voice { get; set; } = TTSVoice.Alloy;

        /// <summary>Output audio format. See <see cref="TTSFormat"/>. Default: mp3.</summary>
        public string ResponseFormat { get; set; } = TTSFormat.Mp3;

        /// <summary>Speed: 0.25 – 4.0. Default: 1.0.</summary>
        public float? Speed { get; set; }
    }

    public class GeneratedSpeech
    {
        public BinaryData AudioData  { get; }
        public string     ContentType { get; }

        internal GeneratedSpeech(byte[] bytes, string contentType)
        {
            AudioData    = new BinaryData(bytes);
            ContentType  = contentType;
        }

        public async Task SaveToFileAsync(string filePath, CancellationToken ct = default)
            => await File.WriteAllBytesAsync(filePath, AudioData.ToArray(), ct);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Client
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Azure OpenAI TTS client. Inherits URL-resolution and auth from
    /// <see cref="AzureAIClientBase"/>.
    ///
    /// <example><code>
    /// _aiClient_TTS = new AzureTTSClient(
    ///     new Uri(_endpoint_tts),
    ///     new ApiKeyCredential(_apiKey_tts),
    ///     _deploymentName_TTS);
    ///
    /// GeneratedSpeech speech = await _aiClient_TTS.GenerateSpeechAsync(
    ///     "Hello, I am TungBot!",
    ///     new SpeechGenerationOptions { Voice = TTSVoice.Nova });
    ///
    /// return File(speech.AudioData.ToArray(), speech.ContentType);
    /// </code></example>
    /// </summary>
    public sealed class AzureTTSClient : AzureAIClientBase
    {
        private const string ResourcePath      = "/audio/speech";
        private const string DefaultApiVersion = "2025-03-01-preview";

        // ── Construction ──────────────────────────────────────────────────────

        public AzureTTSClient(
            Uri              endpoint,
            ApiKeyCredential credential,
            string?          deploymentName = null,
            string           apiVersion     = DefaultApiVersion,
            HttpClient?      httpClient     = null)
            : base(endpoint, credential,
                   deploymentName ?? "tts",
                   ResourcePath, apiVersion,
                   authScheme: "api-key", httpClient)
        { }

        public AzureTTSClient(
            string      endpoint,
            string      apiKey,
            string?     deploymentName = null,
            string      apiVersion     = DefaultApiVersion,
            HttpClient? httpClient     = null)
            : base(endpoint, apiKey,
                   deploymentName ?? "tts",
                   ResourcePath, apiVersion,
                   authScheme: "api-key", httpClient)
        { }

        // ── Public API ────────────────────────────────────────────────────────

        public GeneratedSpeech GenerateSpeech(
            string text, SpeechGenerationOptions? options = null)
            => GenerateSpeechAsync(text, options).GetAwaiter().GetResult();

        public async Task<GeneratedSpeech> GenerateSpeechAsync(
            string                   text,
            SpeechGenerationOptions? options           = null,
            CancellationToken        cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(text))
                throw new ArgumentNullException(nameof(text));

            options ??= new SpeechGenerationOptions();

            var payload = BuildPayload(text, options);

            using var response = await PostJsonAsync(payload, cancellationToken);

            var audioBytes = await response.Content
                .ReadAsByteArrayAsync(cancellationToken)
                .ConfigureAwait(false);

            return new GeneratedSpeech(audioBytes, ResolveContentType(options.ResponseFormat));
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private object BuildPayload(string text, SpeechGenerationOptions opt)
        {
            var dict = new Dictionary<string, object>
            {
                ["model"]           = DeploymentName,
                ["input"]           = text,
                ["voice"]           = opt.Voice,
                ["response_format"] = opt.ResponseFormat,
            };
            if (opt.Speed.HasValue) dict["speed"] = opt.Speed.Value;
            return dict;
        }

        private static string ResolveContentType(string format) => format switch
        {
            TTSFormat.Mp3  => "audio/mpeg",
            TTSFormat.Opus => "audio/ogg; codecs=opus",
            TTSFormat.Aac  => "audio/aac",
            TTSFormat.Flac => "audio/flac",
            TTSFormat.Wav  => "audio/wav",
            TTSFormat.Pcm  => "audio/pcm",
            _              => "audio/mpeg"
        };
    }
}
