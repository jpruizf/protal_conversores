const menuToggle =
    document.getElementById("menutoggle");

const navMenu =
    document.getElementById("navMenu");

const enlacesNav =
    document.querySelectorAll(
        "nav a[href^='#']"
    );

const tarjetas =
    document.querySelectorAll(
        ".converter-card, .converter-card-conciliador"
    );


/* ========================================
   MENU HAMBURGUESA
======================================== */

if (menuToggle && navMenu) {

    menuToggle.addEventListener(
        "click",
        () => {

            navMenu.classList.toggle(
                "active"
            );

            const abierto =
                navMenu.classList.contains(
                    "active"
                );

            menuToggle.setAttribute(
                "aria-expanded",
                abierto
            );
        }
    );

}


/* ========================================
   EVENTO DE LAS OPCIONES DEL NAV
======================================== */

enlacesNav.forEach(
    enlace => {

        enlace.addEventListener(
            "click",
            evento => {

                /*
                 * Evitamos el salto automático
                 * del navegador.
                 */
                evento.preventDefault();


                /*
                 * Obtenemos el href.
                 *
                 * Ejemplo:
                 * "#liq-tarjetas"
                 */
                const selector =
                    enlace.getAttribute(
                        "href"
                    );


                /*
                 * Buscamos la tarjeta
                 * correspondiente.
                 */
                const tarjetaSeleccionada =
                    document.querySelector(
                        selector
                    );


                /*
                 * Si el ID no existe,
                 * detenemos la función.
                 */
                if (!tarjetaSeleccionada) {
                    return;
                }


                /*
                 * Primero limpiamos cualquier
                 * estado anterior.
                 */
                tarjetas.forEach(
                    tarjeta => {

                        tarjeta.classList.remove(
                            "is-dimmed",
                            "is-highlighted"
                        );
                    }
                );


                /*
                 * Desenfocamos todas
                 * las tarjetas.
                 */
                tarjetas.forEach(
                    tarjeta => {

                        tarjeta.classList.add(
                            "is-dimmed"
                        );
                    }
                );


                /*
                 * A la seleccionada le quitamos
                 * el desenfoque.
                 */
                tarjetaSeleccionada.classList.remove(
                    "is-dimmed"
                );


                /*
                 * Y le agregamos el destacado.
                 */
                tarjetaSeleccionada.classList.add(
                    "is-highlighted"
                );


                /*
                 * Scroll suave hacia
                 * la tarjeta.
                 */
                tarjetaSeleccionada.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });


                /*
                 * Cerramos el menú hamburguesa.
                 */
                if (navMenu) {

                    navMenu.classList.remove(
                        "active"
                    );
                }


                if (menuToggle) {

                    menuToggle.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }


                /*
                 * Pasados los 1.5 segundos
                 * restauramos todas las tarjetas.
                 */
                setTimeout(
                    () => {

                        tarjetas.forEach(
                            tarjeta => {

                                tarjeta.classList.remove(
                                    "is-dimmed",
                                    "is-highlighted"
                                );
                            }
                        );

                    },
                    1500
                );

            }
        );

    }
);