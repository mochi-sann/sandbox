#include "SDL.h"

int main(int argc, char *argv[])
{

    SDL_Window *window;

    SDL_Init(SDL_INIT_VIDEO);

    window = SDL_CreateWindow(
        "Hello SDL",
        SDL_WINDOWPOS_UNDEFINED,
        SDL_WINDOWPOS_UNDEFINED,
        640,
        480,
        SDL_WINDOW_OPENGL);

    SDL_bool quit_flag = SDL_FALSE;
    SDL_Event event;

    while (!quit_flag)
    {
        while (SDL_PollEvent(&event))
        {
            switch (event.type)
            {
            case SDL_QUIT:
                quit_flag = SDL_TRUE;
                break;
            }
        }
    }

    SDL_Quit();
    return 0;
}
