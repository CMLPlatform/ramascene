from django.shortcuts import render


def homePage(request):
    context_dict = {}

    return render(request, 'ramasceneMasterProject/home.html', context_dict)
