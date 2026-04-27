namespace SimpleAzureOpenAIChatbot
{
    public class SystemSettings
    {
        //You can find your Azure OpenAI deployment name in the Azure AI Studio portal, the Azure portal (select Deployments on the left-hand side menu), or by using the Azure CLI, PowerShell, or REST API.
        //https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/create-resource?pivots=web-portal
        public static readonly string AI_Chat_Endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT_CHAT") ?? "";
        public static readonly string AI_Chat_DeploymentName = Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT_NAME_CHAT") ?? "gpt-5-mini";
        public static readonly string AI_Chat_ApiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_API_KEY_CHAT") ?? "your_key_here";
        public static readonly string AI_TTS_Endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT_TTS") ?? "";
        public static readonly string AI_TTS_DeploymentName = Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT_NAME_TTS") ?? "tts-hd";
        public static readonly string AI_TTS_ApiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_API_KEY_TTS") ?? "your_key_here";
        public static readonly string AI_Img_Endpoint_FLUX = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT_IMAGE_FLUX") ?? "";
        public static readonly string AI_Img_DeploymentName_FLUX = Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT_NAME_IMG_FLUX") ?? "FLUX.1-Kontext-pro";
        public static readonly string AI_Img_ApiKey_FLUX = Environment.GetEnvironmentVariable("AZURE_OPENAI_API_KEY_IMG_FLUX") ?? "your_key_here";
    }
}