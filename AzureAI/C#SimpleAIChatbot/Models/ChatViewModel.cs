namespace SimpleAzureOpenAIChatbot.Models
{
    public class ChatViewModel
    {
        public string UserInput { get; set; }
        public List<string> ChatHistory { get; set; } = new List<string>();

        public string UserImgReqInput { get; set; }
        public List<string> ImgReqHistory { get; set; } = new List<string>();
    }
}