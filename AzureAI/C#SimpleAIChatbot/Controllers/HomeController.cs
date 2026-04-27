using Microsoft.AspNetCore.Mvc;
using SimpleAzureOpenAIChatbot.Models;
using System.Diagnostics;

namespace SimpleAzureOpenAIChatbot.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }

        public IActionResult Index()
        {
            //Tung hack: Redirect to the chat bot page instead of showing the home page
            return RedirectToAction("Index", "TungBot");
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
