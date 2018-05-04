from django.shortcuts import render

def homePage(request):
    context_dict = {}

    #return render_to_response('/IEMasterProject/HomePage.html', context_dict, context)
    return render(request,'ramasceneMasterProject/home.html', context_dict)

