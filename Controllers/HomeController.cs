using Microsoft.AspNetCore.Mvc;

namespace GearGo.Controllers;

public class HomeController : Controller
{
    public IActionResult Index()
    {
        ViewData["Title"] = "Trang chủ";
        return View();
    }
}
